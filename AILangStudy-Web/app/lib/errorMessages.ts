import { FirebaseError } from 'firebase/app';

interface ErrorMessages {
  [key: string]: string;
}

export const errorMessages: ErrorMessages = {
  // 認証関連のエラー
  'auth/network-request-failed': 'ネットワークエラーが発生しました。インターネット接続を確認してください。',
  'auth/internal-error': '認証中に問題が発生しました。しばらく時間をおいて再度お試しください。',
  
  // Cloud Functions関連のエラー
  'functions/unavailable': 'サービスが一時的に利用できません。しばらく時間をおいて再度お試しください。',
  'functions/internal': 'サーバーでエラーが発生しました。しばらく時間をおいて再度お試しください。',
  'functions/deadline-exceeded': 'リクエストがタイムアウトしました。しばらく時間をおいて再度お試しください。',
  
  // デフォルトエラーメッセージ
  'default': '予期せぬエラーが発生しました。しばらく時間をおいて再度お試しください。'
};

export const getErrorMessage = (error: FirebaseError | Error): string => {
  if (error instanceof FirebaseError && error.code && errorMessages[error.code]) {
    return errorMessages[error.code];
  }
  return errorMessages.default;
};
