// Firestore helpers for Therapy Compass (JS implementation)
import {
  collection,
  getDocs,
  doc,
  getDoc,
  addDoc,
  runTransaction,
  orderBy,
  query,
  where,
  Timestamp,
} from 'firebase/firestore';

import { db } from './clientApp';

export async function getClinicians(firestore = db, filters = {}) {
  const q = query(collection(firestore, 'clinicians'), orderBy('name'));
  const results = await getDocs(q);
  return results.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getClinicianById(firestore = db, clinicianId) {
  const ref = doc(firestore, 'clinicians', clinicianId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

export async function getReviewsForClinician(firestore = db, clinicianId) {
  const q = query(
    collection(firestore, 'reviews'),
    where('clinicianId', '==', clinicianId),
    orderBy('createdAt', 'desc')
  );
  const results = await getDocs(q);
  return results.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function submitReview(firestore = db, clinicianId, review) {
  const reviewsCol = collection(firestore, 'reviews');
  const clinicianRef = doc(firestore, 'clinicians', clinicianId);

  await runTransaction(firestore, async (tx) => {
    await addDoc(reviewsCol, { ...review, clinicianId, createdAt: Timestamp.fromDate(new Date()) });

    const reviewsQ = query(reviewsCol, where('clinicianId', '==', clinicianId));
    const snaps = await getDocs(reviewsQ);
    const all = snaps.docs.map((d) => d.data());
    const avgStyleMatch = all.reduce((s, r) => s + (r.styleMatch || 0), 0) / Math.max(1, all.length);
    const avgCulturalComp = all.reduce((s, r) => s + (r.culturalCompetence || 0), 0) / Math.max(1, all.length);

    tx.update(clinicianRef, { avgStyleMatch, avgCulturalComp });
  });
}
// end of file
