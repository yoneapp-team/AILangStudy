import { initializeApp, getApps, FirebaseError } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, User } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getErrorMessage } from './errorMessages';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);
export const functions = getFunctions(app);

// Cloud Functions
export const createArticle = async ({
  topic,
  sourceLang,
  targetLang,
  uid
}: {
  topic: string;
  sourceLang: string;
  targetLang: string;
  uid: string;
}) => {
  try {
    const createArticleFunction = httpsCallable(functions, 'createArticle');
    const result = await createArticleFunction({ topic, sourceLang, targetLang, uid });
    return result.data;
  } catch (error) {
    if (!(error instanceof FirebaseError)) {
      throw error;
    }
    const message = getErrorMessage(error);
    alert(message);
    throw error;
  }
};

export const analyzeText = async ({
  articleId,
  selectedText,
  startIndex,
  endIndex
}: {
  articleId: string;
  selectedText: string;
  startIndex: number;
  endIndex: number;
}) => {
  try {
    const analyzeTextFunction = httpsCallable(functions, 'analyzeText');
    const result = await analyzeTextFunction({ articleId, selectedText, startIndex, endIndex });
    return result.data;
  } catch (error) {
    if (!(error instanceof FirebaseError)) {
      throw error;
    }
    const message = getErrorMessage(error);
    alert(message);
    throw error;
  }
};

// Anonymous authentication
export const signInAnonymouslyAndGetUser = (): Promise<User> => {
  return new Promise((resolve, reject) => {
    try {
      // First check if user is already signed in
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        unsubscribe(); // Stop listening immediately
        if (user) {
          resolve(user);
        } else {
          // If no user, sign in anonymously
          signInAnonymously(auth)
            .then((result) => resolve(result.user))
            .catch((error) => {
              const message = getErrorMessage(error);
              alert(message);
              reject(error);
            });
        }
      });
    } catch (error) {
      if (!(error instanceof FirebaseError)) {
        throw error;
      }
      const message = getErrorMessage(error);
      alert(message);
      reject(error);
    }
  });
};
