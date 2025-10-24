// src/hooks/useAuthManager.js
import { useState, useEffect } from "react";
import { auth, db } from "../firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

export default function useAuthManager() {
  const [user, setUser] = useState(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [selectedRole, setSelectedRole] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      setIsLoadingData(true);

      if (authUser) {
        try {
          const userDocRef = doc(db, "users", authUser.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            const userWithRole = { ...authUser, ...userData };
            setUser(userWithRole);

            if (userData.username) {
              setSelectedRole(userData.username);
            }

            const idTokenResult = await authUser.getIdTokenResult(true);
            //console.log("Custom claims from token exist:", idTokenResult.claims);
            //console.log("ROLE:", userWithRole);

          } else {
            setUser(authUser);
            await authUser.getIdTokenResult(true);
          }
        } catch (err) {
          console.error("Auth manager error:", err);
        }
      } else {
        // User signed out
        setUser(null);
        setSelectedRole(null);
      }

      setIsLoadingData(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
    setSelectedRole(null);
  };

  return {
    user,
    selectedRole,
    setUser,
  };
}
