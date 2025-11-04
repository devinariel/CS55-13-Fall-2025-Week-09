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
  onSnapshot,
  updateDoc,
} from 'firebase/firestore';

import { db } from './clientApp';
import { auth } from './clientApp';
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
  const data = snap.data();
  // Convert timestamp if it exists
  if (data.timestamp && data.timestamp.toDate) {
    return { id: snap.id, ...data, timestamp: data.timestamp.toDate() };
  }
  return { id: snap.id, ...data };
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

// Alias for compatibility with code that expects getReviewsByClinicianId
export async function getReviewsByClinicianId(firestore = db, clinicianId) {
  const reviews = await getReviewsForClinician(firestore, clinicianId);
  // Convert to expected format with timestamp field
  return reviews.map(review => ({
    ...review,
    timestamp: review.createdAt?.toDate ? review.createdAt.toDate() : (review.createdAt || new Date()),
    text: review.reviewText || review.text || '',
  }));
}

// Subscribe to review snapshots for a clinician
export function getReviewsSnapshotByClinicianId(clinicianId, cb) {
  if (!clinicianId) {
    console.log("Error: Invalid clinicianId received: ", clinicianId);
    return () => {};
  }

  const q = query(
    collection(db, 'reviews'),
    where('clinicianId', '==', clinicianId),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(q, (querySnapshot) => {
    const results = querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        timestamp: data.createdAt?.toDate ? data.createdAt.toDate() : (data.createdAt || new Date()),
        text: data.reviewText || data.text || '',
      };
    });
    cb(results);
  });
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

// Alias for compatibility with code that expects addReviewToClinician
// Note: This function uses the old rating structure, but we'll adapt it to work with reviews collection
export async function addReviewToClinician(firestore = db, clinicianId, review) {
  if (!clinicianId) {
    throw new Error("No clinician ID has been provided.");
  }
  if (!review) {
    throw new Error("A valid review has not been provided.");
  }

  // Convert old review format to new format if needed
  const reviewData = {
    userId: review.userId,
    reviewText: review.text || review.reviewText || '',
    styleMatch: review.styleMatch || review.rating || 5,
    modalityExpertise: review.modalityExpertise || 5,
    accessibility: review.accessibility || 5,
    culturalCompetence: review.culturalCompetence || 5,
  };

  await submitReview(firestore, clinicianId, reviewData);
}

// Subscribe to a clinician document snapshot by id
export function getClinicianSnapshotById(clinicianId, cb) {
  if (!clinicianId) return () => {};
  const docRef = doc(db, 'clinicians', clinicianId);
  const unsub = onSnapshot(docRef, (snap) => {
    if (snap.exists()) {
      cb({ id: snap.id, ...snap.data() });
    } else {
      cb(null);
    }
  });
  return unsub;
}

// Update the photo reference on a clinician document
export async function updateClinicianImageReference(clinicianId, publicImageUrl) {
  const clinicianRef = doc(db, 'clinicians', clinicianId);
  await updateDoc(clinicianRef, { photo: publicImageUrl });
}

// Generate diverse profile image URL using multiple services for variety
function getDiverseProfileImage(index, name) {
  // Use Pravatar for diverse professional headshots (1-70 available)
  // These are real-looking diverse portraits that work well for professional profiles
  const pravatarIndex = (index % 70) + 1;
  
  // Ensure we get different images by using the index
  // Pravatar provides diverse professional-looking photos
  return `https://i.pravatar.cc/300?img=${pravatarIndex}`;
  
  // Alternative options if Pravatar doesn't work well:
  // Option 1: Dicebear with professional style
  // const seed = name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() + index;
  // return `https://api.dicebear.com/7.x/personas/svg?seed=${seed}`;
  
  // Option 2: RandomUser API (requires different approach)
  // return `https://randomuser.me/api/portraits/${index % 2 === 0 ? 'men' : 'women'}/${(index % 50) + 1}.jpg`;
}

export async function addFakeData() {
  try {
    // Check if user is authenticated
    if (!auth?.currentUser) {
      throw new Error('You must be signed in to add sample data. Please sign in and try again.');
    }
    
    console.log('Starting to add fake data...');
    console.log('Current user:', auth.currentUser.uid);
    
    const cliniciansCol = collection(db, 'clinicians');
    const reviewsCol = collection(db, 'reviews');

    // Clear existing data with error handling
    try {
      const existingClinicians = await getDocs(query(cliniciansCol));
      console.log(`Found ${existingClinicians.size} existing clinicians to delete`);
      const deletePromises = existingClinicians.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      console.log('Deleted existing clinicians');
    } catch (deleteError) {
      console.warn('Error deleting existing clinicians (continuing anyway):', deleteError);
      // Continue even if deletion fails
    }

    try {
      const existingReviews = await getDocs(query(reviewsCol));
      console.log(`Found ${existingReviews.size} existing reviews to delete`);
      const deletePromises = existingReviews.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      console.log('Deleted existing reviews');
    } catch (deleteError) {
      console.warn('Error deleting existing reviews (continuing anyway):', deleteError);
      // Continue even if deletion fails
    }

    // Generate 21 clinicians (all names from the list)
    const namesToUse = randomData.clinicianNames.slice(0, 21);
    console.log(`Generating ${namesToUse.length} clinicians...`);
    
    // Ensure varied modalities distribution
    const modalities = [...randomData.clinicianModalities];
    
    for (let i = 0; i < namesToUse.length; i++) {
      const name = namesToUse[i];
      
      // Distribute modalities more evenly
      const modalityIndex = i % modalities.length;
      const modality = modalities[modalityIndex];
      
      // Rotate through modalities to ensure variety
      if (i > 0 && i % modalities.length === 0) {
        // Shuffle modalities array for next round
        modalities.sort(() => Math.random() - 0.5);
      }
      
      const clinician = {
        name: name,
        city: randomData.clinicianCities[Math.floor(Math.random() * randomData.clinicianCities.length)],
        specialization: randomData.clinicianSpecialties[Math.floor(Math.random() * randomData.clinicianSpecialties.length)],
        modality: modality,
        profilePicture: getDiverseProfileImage(i, name),
        photo: getDiverseProfileImage(i, name),
        avgStyleMatch: parseFloat((Math.random() * 4 + 1).toFixed(1)),
        avgCulturalComp: parseFloat((Math.random() * 4 + 1).toFixed(1)),
        numRatings: Math.floor(Math.random() * 50),
        sumRating: 0, // Will be calculated when reviews are added
        avgRating: 0, // Will be calculated when reviews are added
      };
      
      console.log(`Adding clinician ${i + 1}/${namesToUse.length}: ${name}`);
      const clinicianDoc = await addDoc(cliniciansCol, clinician);
      
      // Add some fake reviews
      // Use the current authenticated user's ID for reviews (required by Firestore rules)
      const reviewUserId = auth.currentUser.uid;
      
      const numReviews = Math.floor(Math.random() * 5) + 1; // At least 1 review
      for (let j = 0; j < numReviews; j++) {
        const review = randomData.clinicianReviews[Math.floor(Math.random() * randomData.clinicianReviews.length)];
        try {
          await addDoc(reviewsCol, {
            clinicianId: clinicianDoc.id,
            userId: reviewUserId,
            reviewText: review.text,
            styleMatch: review.rating,
            modalityExpertise: review.rating,
            accessibility: review.rating,
            culturalCompetence: review.rating,
            createdAt: Timestamp.fromDate(new Date()),
          });
        } catch (reviewError) {
          console.warn(`Failed to add review ${j + 1} for ${name}:`, reviewError);
          // Continue with other reviews even if one fails
        }
      }
    }

    console.log(`Successfully added ${namesToUse.length} clinicians with diverse profile images to Firestore.`);
    return { success: true, count: namesToUse.length };
  } catch (error) {
    console.error('Error in addFakeData:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    throw error;
  }
}

// end of file
