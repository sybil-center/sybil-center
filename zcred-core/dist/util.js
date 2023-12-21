export function repeatUtil(shouldStop, betweenMS, fn) {
    return new Promise(async (resolve) => {
        let shouldProceed = true;
        while (shouldProceed) {
            const result = await execute(fn);
            if (shouldStop(result)) {
                shouldProceed = false;
                return resolve(result);
            }
            await new Promise((resolve1) => setTimeout(resolve1, betweenMS));
        }
    });
}
async function execute(fn) {
    try {
        return await fn();
    }
    catch (e) {
        return e;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbC5qcyIsInNvdXJjZVJvb3QiOiIuL3NyYy8iLCJzb3VyY2VzIjpbInV0aWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsTUFBTSxVQUFVLFVBQVUsQ0FDeEIsVUFBcUMsRUFDckMsU0FBaUIsRUFDakIsRUFBb0I7SUFFcEIsT0FBTyxJQUFJLE9BQU8sQ0FBWSxLQUFLLEVBQUUsT0FBTyxFQUFFLEVBQUU7UUFDOUMsSUFBSSxhQUFhLEdBQUcsSUFBSSxDQUFDO1FBQ3pCLE9BQU8sYUFBYSxFQUFFO1lBQ3BCLE1BQU0sTUFBTSxHQUFHLE1BQU0sT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ2pDLElBQUksVUFBVSxDQUFDLE1BQU0sQ0FBQyxFQUFFO2dCQUN0QixhQUFhLEdBQUcsS0FBSyxDQUFDO2dCQUN0QixPQUFPLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQzthQUN4QjtZQUNELE1BQU0sSUFBSSxPQUFPLENBQUMsQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDLFVBQVUsQ0FBQyxRQUFRLEVBQUUsU0FBUyxDQUFDLENBQUMsQ0FBQztTQUNsRTtJQUNILENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQztBQUVELEtBQUssVUFBVSxPQUFPLENBQ3BCLEVBQW9CO0lBRXBCLElBQUk7UUFDRixPQUFPLE1BQU0sRUFBRSxFQUFFLENBQUM7S0FDbkI7SUFBQyxPQUFPLENBQUMsRUFBRTtRQUNWLE9BQU8sQ0FBVSxDQUFDO0tBQ25CO0FBQ0gsQ0FBQyJ9