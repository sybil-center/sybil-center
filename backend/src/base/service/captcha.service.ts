import { tokens } from "typed-inject";
import { ClientError, ServerError } from "../../backbone/errors.js";
import { ILogger } from "../../backbone/logger.js";

/** ClassificationReason enum */
enum ClassificationReasonEnum {
  CLASSIFICATION_REASON_UNSPECIFIED = 0,
  AUTOMATION = 1,
  UNEXPECTED_ENVIRONMENT = 2,
  TOO_MUCH_TRAFFIC = 3,
  UNEXPECTED_USAGE_PATTERNS = 4,
  LOW_CONFIDENCE_SCORE = 5,
  SUSPECTED_CARDING = 6,
  SUSPECTED_CHARGEBACK = 7
}

/** Invalid assessment reason enum */
enum InvalidReasonEnum {
  INVALID_REASON_UNSPECIFIED = 0,
  UNKNOWN_INVALID_REASON = 1,
  MALFORMED = 2,
  EXPIRED = 3,
  DUPE = 4,
  MISSING = 5,
  BROWSER_ERROR = 6
}

type AssessmentResult = {
  name: string;
  event: {
    token: string;
    siteKey: string;
    userAgent: string;
    userIpAddress: string;
    expectedAction: string;
    hashedAccountId: string;
    express: boolean;
    requestedUri: string;
    wafTokenAssessment: string;
    ja3: string;
    headers: [];
    firewallPolicyEvaluation: boolean;
  },
  riskAnalysis: {
    score: number;
    reasons: ClassificationReasonEnum[];
    extendedVerdictReasons: [];
  },
  tokenProperties: {
    valid: boolean;
    invalidReason: InvalidReasonEnum[] | keyof typeof InvalidReasonEnum;
    hostname: string;
    androidPackageName: string;
    iosBundleId: string;
    action: string;
    createTime: Date;
  }
}

type IsHumanResult = {
  /** Is human */
  isHuman: boolean;
  /**
   * Google reRECAPTCHA humanity score in range from 0 to 1.
   * If score = 1 humanity probability is high
   * if score = 0 humanity probability is low
   */
  score: number;
  /** Score reduce reason */
  reasons: ClassificationReasonEnum[]
}

/** CAPTCHA service interface */
export interface ICaptchaService {
  /**
   * Check humanity
   * @param captchaToken CAPTCHA token to check humanity
   * @param action action of user. This parameter sets on frontend before
   *               you receive captchaToken. You can validate "action" from token
   *               when assessment will be received,
   *               assessment.tokenProperties.action === action
   */
  isHuman(captchaToken: string, action?: string): Promise<IsHumanResult>;
}

/** Google reCAPTCHA service enterprise implementation */
export class CaptchaService implements ICaptchaService {

  private readonly assessmentEP;

  static inject = tokens(
    "config",
    "logger"
  );
  constructor(
    private readonly config: {
      gcProjectId: string;
      captchaSiteKey: string;
      captchaApiKey: string;
    },
    private readonly logger: ILogger
  ) {
    this.assessmentEP =
      new URL(`https://recaptchaenterprise.googleapis.com/v1/projects/${this.config.gcProjectId}/assessments`);
    this.assessmentEP.searchParams.append("key", this.config.captchaApiKey);
  }

  private async getAssessment(captchaToken: string, action?: string): Promise<AssessmentResult> {
    const resp = await fetch(this.assessmentEP, {
      method: "POST",
      body: JSON.stringify({
        event: {
          token: captchaToken,
          siteKey: this.config.captchaSiteKey,
          expectedAction: action
        }
      })
    });
    if (resp.status !== 200) throw new ServerError("Internal server error", {
      props: {
        _place: this.constructor.name,
        _log: `reCAPTCHA assessment error. ${JSON.stringify(await resp.json())}`
      }
    });
    const assessment = await resp.json();
    const tokenCrateTime = assessment?.tokenProperties?.createTime;
    assessment.tokenProperties.createTime = tokenCrateTime
      ? new Date(tokenCrateTime)
      : undefined;

    return assessment as AssessmentResult;
  }

  async isHuman(captchaToken: string, action?: string): Promise<IsHumanResult> {
    const { tokenProperties, riskAnalysis } = await this.getAssessment(captchaToken, action);
    if (!tokenProperties.valid) {
      this.logger.error(`CAPTCHA invalid result: ${tokenProperties?.invalidReason}`);
      throw new ClientError("CAPTCHA token is not valid");
    }
    if (action && tokenProperties?.action !== action) {
      throw new ClientError("Invalid action");
    }
    const isHuman = riskAnalysis.score >= 0.7;
    if (!isHuman) this.logger.info(`Robot try to authenticate in application: ${riskAnalysis}`);
    return {
      score: riskAnalysis.score,
      isHuman: isHuman,
      reasons: riskAnalysis.reasons
    };
  }
}
