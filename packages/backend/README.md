# VC ISSUER

---

to run app local copy `dev.env` to `.env`, configure `.env` file and use command below:

```
npm run dev
```

---

to run app from `docker` configure `.env` file in root dir and use commands below:

```
docker build -t vc-provider .
docker run --env-file=dev.env -p 8080:8080 vc-provider
```
