import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, deleteDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider, signInWithPopup, signOut } from '../lib/firebase';
import { Customer, Host, UserProfile, AuditLogEntry, CustomClientRequirement } from '../types';

interface AuthContextType {
  user: UserProfile | null;
  firebaseUser: User | null;
  loading: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  lgpdConsent: boolean;
  acceptLgpdConsent: () => Promise<void>;
  syncDataToCloud: (data: { customers: Customer[]; hosts: Host[]; customRequirements?: Record<string, CustomClientRequirement[]> }) => Promise<boolean>;
  loadDataFromCloud: () => Promise<{ customers: Customer[]; hosts: Host[]; customRequirements?: Record<string, CustomClientRequirement[]> } | null>;
  logAuditEvent: (action: AuditLogEntry['action'], target: string, details: string) => Promise<void>;
  exportUserDataZipOrJson: (customers: Customer[], hosts: Host[]) => void;
  deleteUserAccountAndData: () => Promise<void>;
  auditLogs: AuditLogEntry[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lgpdConsent, setLgpdConsent] = useState<boolean>(() => {
    return localStorage.getItem('zabbix_lgpd_consent') === 'true';
  });
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(() => {
    try {
      const stored = localStorage.getItem('zabbix_audit_logs');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Track Auth state from Firebase
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currUser) => {
      setFirebaseUser(currUser);
      if (currUser) {
        try {
          const userDocRef = doc(db, 'users', currUser.uid);
          const snap = await getDoc(userDocRef);

          let profileData: UserProfile;
          if (snap.exists()) {
            profileData = snap.data() as UserProfile;
            // update last login
            await setDoc(userDocRef, { lastLoginAt: new Date().toISOString() }, { merge: true });
          } else {
            profileData = {
              userId: currUser.uid,
              email: currUser.email,
              displayName: currUser.displayName || 'Usuário Zabbix',
              photoURL: currUser.photoURL,
              createdAt: new Date().toISOString(),
              lastLoginAt: new Date().toISOString(),
              lgpdConsentAccepted: lgpdConsent,
              lgpdConsentTimestamp: lgpdConsent ? new Date().toISOString() : undefined,
            };
            await setDoc(userDocRef, profileData);
          }
          setUserProfile(profileData);
          if (profileData.lgpdConsentAccepted) {
            setLgpdConsent(true);
            localStorage.setItem('zabbix_lgpd_consent', 'true');
          }
        } catch (err) {
          console.error('Error fetching user profile from Firestore:', err);
          // Fallback to local profile
          setUserProfile({
            userId: currUser.uid,
            email: currUser.email,
            displayName: currUser.displayName,
            photoURL: currUser.photoURL,
            createdAt: new Date().toISOString(),
          });
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [lgpdConsent]);

  const signInWithGoogle = async () => {
    try {
      setError(null);
      setLoading(true);
      const result = await signInWithPopup(auth, googleProvider);
      const loggedUser = result.user;

      await logAuditEvent(
        'LOGIN',
        'Autenticação Google',
        `Usuário ${loggedUser.email} conectado com sucesso.`
      );
    } catch (err: any) {
      console.error('Google Sign-In Error:', err);
      setError(err?.message || 'Falha ao autenticar com o Google.');
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      if (firebaseUser) {
        await logAuditEvent('LOGOUT', 'Sessão Finalizada', `Logout efetuado por ${firebaseUser.email}`);
      }
      await signOut(auth);
      setFirebaseUser(null);
      setUserProfile(null);
    } catch (err: any) {
      console.error('Logout error:', err);
    }
  };

  const acceptLgpdConsent = async () => {
    setLgpdConsent(true);
    localStorage.setItem('zabbix_lgpd_consent', 'true');
    const now = new Date().toISOString();

    if (firebaseUser) {
      try {
        await setDoc(
          doc(db, 'users', firebaseUser.uid),
          {
            lgpdConsentAccepted: true,
            lgpdConsentTimestamp: now,
          },
          { merge: true }
        );
        await logAuditEvent(
          'LGPD_CONSENT',
          'Termo de Privacidade & LGPD',
          'Consentimento aceito pelo usuário para tratamento de métricas técnicas e de infraestrutura.'
        );
      } catch (e) {
        console.error('Failed to sync LGPD consent to cloud:', e);
      }
    }
  };

  const logAuditEvent = async (action: AuditLogEntry['action'], target: string, details: string) => {
    const entry: AuditLogEntry = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      userId: firebaseUser?.uid || 'anonymous',
      userEmail: firebaseUser?.email || 'local-operator@zabbix',
      action,
      target,
      details,
      timestamp: new Date().toISOString(),
    };

    setAuditLogs((prev) => {
      const next = [entry, ...prev].slice(0, 100);
      localStorage.setItem('zabbix_audit_logs', JSON.stringify(next));
      return next;
    });

    if (firebaseUser) {
      try {
        const auditColRef = collection(db, 'users', firebaseUser.uid, 'audit_logs');
        await addDoc(auditColRef, {
          ...entry,
          serverTimestamp: serverTimestamp(),
        });
      } catch (err) {
        console.warn('Could not write audit log to Firestore:', err);
      }
    }
  };

  const syncDataToCloud = async (data: {
    customers: Customer[];
    hosts: Host[];
    customRequirements?: Record<string, CustomClientRequirement[]>;
  }): Promise<boolean> => {
    if (!firebaseUser) return false;
    try {
      const dataDocRef = doc(db, 'users', firebaseUser.uid, 'data', 'main');
      await setDoc(
        dataDocRef,
        {
          userId: firebaseUser.uid,
          customers: data.customers,
          hosts: data.hosts,
          customRequirements: data.customRequirements || {},
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      await logAuditEvent(
        'CUSTOMER_UPDATE',
        'Sincronização em Nuvem',
        `Sincronizados ${data.customers.length} clientes e ${data.hosts.length} hosts no Firestore.`
      );
      return true;
    } catch (err) {
      console.error('Error syncing data to Firestore:', err);
      return false;
    }
  };

  const loadDataFromCloud = async (): Promise<{
    customers: Customer[];
    hosts: Host[];
    customRequirements?: Record<string, CustomClientRequirement[]>;
  } | null> => {
    if (!firebaseUser) return null;
    try {
      const dataDocRef = doc(db, 'users', firebaseUser.uid, 'data', 'main');
      const snap = await getDoc(dataDocRef);
      if (snap.exists()) {
        const cloudData = snap.data();
        return {
          customers: cloudData.customers || [],
          hosts: cloudData.hosts || [],
          customRequirements: cloudData.customRequirements || {},
        };
      }
      return null;
    } catch (err) {
      console.error('Error reading data from Firestore:', err);
      return null;
    }
  };

  // LGPD Art. 18 - Portabilidade de Dados
  const exportUserDataZipOrJson = (customers: Customer[], hosts: Host[]) => {
    const fullData = {
      exportMetadata: {
        system: 'Zabbix Trigger Factory & Compliance Hub',
        exportDate: new Date().toISOString(),
        lgpdArticle: 'Artigo 18, Inciso V (Portabilidade dos Dados)',
        user: userProfile,
      },
      auditTrail: auditLogs,
      customers,
      hosts,
    };

    const blob = new Blob(['\uFEFF' + JSON.stringify(fullData, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lgpd_portabilidade_dados_${userProfile?.userId || 'local'}_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    logAuditEvent('DATA_EXPORT', 'Portabilidade LGPD', 'Download do arquivo completo de dados do titular realizado.');
  };

  // LGPD Art. 18 - Direito à Eliminação dos Dados Pessoais
  const deleteUserAccountAndData = async () => {
    if (!firebaseUser) return;
    try {
      const dataDocRef = doc(db, 'users', firebaseUser.uid, 'data', 'main');
      const userDocRef = doc(db, 'users', firebaseUser.uid);
      await deleteDoc(dataDocRef);
      await deleteDoc(userDocRef);

      localStorage.removeItem('zabbix_customers');
      localStorage.removeItem('zabbix_hosts');
      localStorage.removeItem('zabbix_audit_logs');
      localStorage.removeItem('zabbix_lgpd_consent');

      await signOut(auth);
      setFirebaseUser(null);
      setUserProfile(null);
      setLgpdConsent(false);
    } catch (err) {
      console.error('Error deleting account and data:', err);
      throw err;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user: userProfile,
        firebaseUser,
        loading,
        error,
        signInWithGoogle,
        logout,
        lgpdConsent,
        acceptLgpdConsent,
        syncDataToCloud,
        loadDataFromCloud,
        logAuditEvent,
        exportUserDataZipOrJson,
        deleteUserAccountAndData,
        auditLogs,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
