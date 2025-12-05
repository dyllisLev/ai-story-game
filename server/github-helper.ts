import { Octokit } from '@octokit/rest';

/**
 * GitHub 클라이언트를 생성합니다.
 * GITHUB_PERSONAL_ACCESS_TOKEN secret을 사용하여 인증합니다.
 */
export async function getUncachableGitHubClient(): Promise<Octokit> {
  const token = process.env.GITHUB_PERSONAL_ACCESS_TOKEN;
  
  if (!token) {
    throw new Error('GITHUB_PERSONAL_ACCESS_TOKEN secret이 설정되지 않았습니다. Replit Secrets에서 설정해주세요.');
  }
  
  return new Octokit({
    auth: token,
  });
}
