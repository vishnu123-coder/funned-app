// ECE Confession app - anonymous confessions inbox + Instagram Story cards (Expo + Firebase)
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, query, where, limit, getDocs } from 'firebase/firestore';
import { auth, db } from './src/firebase';
import { Login, Inbox } from './src/screens';

export default function App() {
  const [user, setUser] = useState(null); const [page, setPage] = useState(null); const [ready, setReady] = useState(false);

  useEffect(() => onAuthStateChanged(auth, async (u) => {
    setUser(u);
    if (u) {
      try {
        const snap = await getDocs(query(collection(db, 'pages'), where('owner', '==', u.uid), limit(1)));
        setPage(snap.docs[0] ? { slug: snap.docs[0].id, ...snap.docs[0].data() } : null);
      } catch (e) { setPage(null); }
    } else setPage(null);
    setReady(true);
  }), []);

  if (!ready) return <View style={{ flex: 1, backgroundColor: '#000' }} />;
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      {user
        ? <Inbox page={page} onLogout={() => signOut(auth)} />
        : <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}><Login /></SafeAreaView>}
    </SafeAreaProvider>
  );
}
