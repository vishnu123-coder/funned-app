import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, Modal, StyleSheet, Alert, RefreshControl, Share as RNShare } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ViewShot from 'react-native-view-shot';
import Share, { Social } from 'react-native-share';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { collection, query, where, onSnapshot, getDocs, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { EMAIL_DOMAIN, PAGE_URL, FB_APP_ID } from './consts';

export const PINK = '#ff3d8b';

// confession doc -> plain object (created_at as milliseconds)
const toItem = (d) => {
  const x = d.data({ serverTimestamps: 'estimate' });
  return { id: d.id, ...x, created_at: x.created_at?.toMillis ? x.created_at.toMillis() : Date.now() };
};

// ---- Story card (captured as a 1080x1920 image) ----
export function Card({ text, title }) {
  const n = text.length;
  const size = n < 40 ? 64 : n < 120 ? 46 : n < 260 ? 34 : 26;
  return (
    <View style={s.card}>
      <View style={[s.cloud, { top: -70, right: -70 }]} />
      <View style={[s.cloud, { bottom: -80, left: -80, width: 260, height: 260 }]} />
      <Text style={[s.deco, { top: 30, left: 24, fontSize: 40 }]}>♥</Text>
      <Text style={[s.deco, { top: 210, right: 30, fontSize: 28, color: '#fff' }]}>♡</Text>
      <Text style={[s.deco, { bottom: 70, right: 28, fontSize: 48 }]}>♥</Text>
      <Text style={[s.deco, { bottom: 220, left: 26, fontSize: 26, color: '#fff' }]}>♡</Text>
      <Text style={[s.deco, { top: 150, left: 40, fontSize: 18 }]}>✦</Text>
      <Text style={[s.deco, { bottom: 140, right: 90, fontSize: 18 }]}>✦</Text>
      <Text style={s.crown}>♛</Text>
      <Text style={s.title}>{title}</Text>
      <View style={s.line} />
      <View style={s.body}>
        <Text style={[s.msg, { fontSize: size, lineHeight: size * 1.25 }]}>{text}</Text>
        <Text style={[s.deco, { position: 'relative', fontSize: 34, marginTop: 14 }]}>♥</Text>
      </View>
    </View>
  );
}

// ---- Login ----
export function Login() {
  const [u, setU] = useState(''); const [p, setP] = useState(''); const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true);
    try { await signInWithEmailAndPassword(auth, `${u.trim().toLowerCase()}@${EMAIL_DOMAIN}`, p); }
    catch (e) { Alert.alert('Login failed', 'Check your username and password.'); }
    setBusy(false);
  };
  return (
    <View style={s.center}>
      <Text style={s.h1}>Confession</Text>
      <TextInput style={s.input} placeholder="Username" placeholderTextColor="#999" autoCapitalize="none" value={u} onChangeText={setU} />
      <TextInput style={s.input} placeholder="Password" placeholderTextColor="#999" secureTextEntry value={p} onChangeText={setP} />
      <TouchableOpacity style={s.btn} onPress={go} disabled={busy}><Text style={s.btnT}>{busy ? 'Logging in…' : 'Log in'}</Text></TouchableOpacity>
    </View>
  );
}

// ---- Inbox ----
export function Inbox({ page, onLogout }) {
  const [items, setItems] = useState([]); const [sel, setSel] = useState(null); const [busy, setBusy] = useState(false);
  const shot = useRef();
  const q = useCallback(() => query(collection(db, 'confessions'), where('page_slug', '==', page.slug)), [page]);
  const sort = (a) => a.sort((x, y) => y.created_at - x.created_at);

  // live updates: Firebase only sends what changed
  useEffect(() => {
    if (!page) return;
    return onSnapshot(q(), (snap) => setItems(sort(snap.docs.map(toItem))), () => {});
  }, [page, q]);
  const load = useCallback(async () => { if (page) setItems(sort((await getDocs(q())).docs.map(toItem))); }, [page, q]);

  const patch = async (id, v) => { setItems(a => a.map(x => x.id === id ? { ...x, ...v } : x)); try { await updateDoc(doc(db, 'confessions', id), v); } catch (e) { load(); } };
  const del = id => Alert.alert('Delete this confession?', '', [{ text: 'Cancel' }, { text: 'Delete', style: 'destructive', onPress: async () => { setSel(null); try { await deleteDoc(doc(db, 'confessions', id)); } catch (e) { load(); } } }]);
  const toStory = async () => {
    setBusy(true);
    try {
      const raw = await shot.current.capture(); // path of the 1080x1920 card image
      const uri = /^(file|data|content):/.test(raw) ? raw : 'file://' + raw;
      let shared = false;
      try {
        await Share.shareSingle({ social: Social.InstagramStories, appId: FB_APP_ID, backgroundImage: uri, backgroundBottomColor: '#000000', backgroundTopColor: '#000000' });
        shared = true;
      } catch (e1) {
        // Instagram direct share failed -> open the normal share menu (pick Instagram > Story there)
        try { await Share.open({ url: uri, type: 'image/png', failOnCancel: false }); shared = true; }
        catch (e2) { Alert.alert('Share failed', String((e2 && e2.message) || e2) + '\n\nStory error: ' + String((e1 && e1.message) || e1)); }
      }
      if (shared) patch(sel.id, { is_posted: true });
    } catch (e) {
      Alert.alert('Could not create the story image', String((e && e.message) || e));
    }
    setBusy(false);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
      <View style={s.head}>
        <Text style={s.h2}>{page?.title || 'Inbox'}</Text>
        <TouchableOpacity onPress={onLogout}><Text style={s.link}>Log out</Text></TouchableOpacity>
      </View>
      <TouchableOpacity style={s.linkBox} onPress={() => RNShare.share({ message: PAGE_URL + (page?.slug || '') })}>
        <Text style={s.link}>Share your confession link</Text>
      </TouchableOpacity>
      <FlatList data={items} keyExtractor={i => i.id} refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={PINK} />}
        ListEmptyComponent={<Text style={s.empty}>{page ? 'No confessions yet. Pin your link in your Instagram bio to get them.' : 'No page is linked to this account yet. Add it in Firebase (see README, step 4).'}</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity style={s.row} onPress={() => setSel(item)}>
            <Text style={s.rowT} numberOfLines={3}>{item.body}</Text>
            <Text style={s.meta}>{item.is_fav ? '★ ' : ''}{item.is_posted ? 'Posted · ' : ''}{new Date(item.created_at).toLocaleString()}</Text>
          </TouchableOpacity>
        )} />
      <Modal visible={!!sel} animationType="slide" onRequestClose={() => setSel(null)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#0a0a0a', alignItems: 'center' }}>
          {sel && (<>
            <ViewShot ref={shot} options={{ format: 'png', quality: 1, result: 'tmpfile', width: 1080, height: 1920 }} style={{ marginTop: 8, transform: [{ scale: 0.82 }], marginVertical: -58 }}>
              <Card text={sel.body} title={page?.title || 'Confession'} />
            </ViewShot>
            <View style={s.actions}>
              <TouchableOpacity style={[s.btn, { flex: 1 }]} onPress={toStory} disabled={busy}><Text style={s.btnT}>{busy ? 'Opening…' : 'Share to Instagram Story'}</Text></TouchableOpacity>
            </View>
            <View style={s.actions}>
              <TouchableOpacity style={s.ghost} onPress={() => { patch(sel.id, { is_fav: !sel.is_fav }); setSel({ ...sel, is_fav: !sel.is_fav }); }}><Text style={s.link}>{sel.is_fav ? '★ Unfavourite' : '☆ Favourite'}</Text></TouchableOpacity>
              <TouchableOpacity style={s.ghost} onPress={() => del(sel.id)}><Text style={[s.link, { color: '#ff6b6b' }]}>Delete</Text></TouchableOpacity>
              <TouchableOpacity style={s.ghost} onPress={() => setSel(null)}><Text style={s.link}>Close</Text></TouchableOpacity>
            </View>
          </>)}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#000' },
  h1: { fontFamily: 'Pacifico_400Regular', color: '#fff', fontSize: 44, textAlign: 'center', marginBottom: 28, textShadowColor: PINK, textShadowRadius: 16 },
  h2: { fontFamily: 'Pacifico_400Regular', color: '#fff', fontSize: 26 },
  input: { backgroundColor: '#16060d', borderColor: PINK, borderWidth: 1.5, borderRadius: 14, color: '#fff', padding: 14, marginBottom: 12, fontSize: 16 },
  btn: { backgroundColor: PINK, borderRadius: 999, padding: 15, alignItems: 'center' },
  btnT: { color: '#fff', fontWeight: '700', fontSize: 16 },
  ghost: { padding: 12 }, link: { color: '#ffb3d1', fontSize: 15 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18 },
  linkBox: { paddingHorizontal: 18, paddingBottom: 10 },
  row: { backgroundColor: '#16060d', marginHorizontal: 14, marginBottom: 10, padding: 14, borderRadius: 16, borderColor: '#ff3d8b66', borderWidth: 1 },
  rowT: { color: '#fff', fontSize: 16 }, meta: { color: '#ffffff88', fontSize: 12, marginTop: 8 },
  empty: { color: '#ffb3d1', textAlign: 'center', padding: 30 },
  actions: { flexDirection: 'row', width: '100%', paddingHorizontal: 18, marginTop: 6, justifyContent: 'space-around' },
  card: { width: 360, height: 640, backgroundColor: '#000', overflow: 'hidden', alignItems: 'center' },
  cloud: { position: 'absolute', width: 220, height: 220, borderRadius: 130, backgroundColor: '#ff3d8b', opacity: 0.35 },
  deco: { position: 'absolute', color: PINK, textShadowColor: PINK, textShadowRadius: 10 },
  crown: { color: PINK, fontSize: 30, marginTop: 56 },
  title: { fontFamily: 'Pacifico_400Regular', color: '#fff', fontSize: 40, textAlign: 'center', textShadowColor: PINK, textShadowRadius: 14, paddingHorizontal: 20 },
  line: { height: 4, width: 190, backgroundColor: PINK, borderRadius: 4, marginTop: 4 },
  body: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 34 },
  msg: { fontFamily: 'GreatVibes_400Regular', color: '#fff', textAlign: 'center', textShadowColor: '#ff8fbf', textShadowRadius: 12 },
});
