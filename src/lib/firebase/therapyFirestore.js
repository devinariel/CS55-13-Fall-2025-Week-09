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
  deleteDoc,
} from 'firebase/firestore';

import { db } from './clientApp';
import { randomData } from '../randomData';

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

export async function addFakeData() {
  const cliniciansCol = collection(db, 'clinicians');
  const reviewsCol = collection(db, 'reviews');

  // Clear existing data
  const existingClinicians = await getDocs(query(cliniciansCol));
  existingClinicians.forEach(doc => deleteDoc(doc.ref));
  const existingReviews = await getDocs(query(reviewsCol));
  existingReviews.forEach(doc => deleteDoc(doc.ref));

  // Add new data
  for (const name of randomData.clinicianNames) {
    const clinician = {
      name: name,
      city: randomData.clinicianCities[Math.floor(Math.random() * randomData.clinicianCities.length)],
      specialization: randomData.clinicianSpecialties[Math.floor(Math.random() * randomData.clinicianSpecialties.length)],
      profilePicture: `https://storage.googleapis.com/firestorequickstarts.appspot.com/food_${Math.floor(Math.random() * 22) + 1}.png`,
      avgStyleMatch: (Math.random() * 4 + 1).toFixed(1),
      avgCulturalComp: (Math.random() * 4 + 1).toFixed(1),
      numRatings: Math.floor(Math.random() * 50),
    };
    await addDoc(cliniciansCol, clinician);
  }

  console.log('Sample data added to Firestore.');
}

// end of file
