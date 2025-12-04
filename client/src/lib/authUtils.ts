export function isUnauthorizedError(error: Error): boolean {
  return /^401: .*Unauthorized/.test(error.message) || 
         error.message.includes("로그인이 필요합니다") ||
         error.message.includes("Unauthorized");
}
