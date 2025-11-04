// import helper functions to work with Firebase Storage
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";

// import the initialized storage instance from the client app
import { storage } from "@/src/lib/firebase/clientApp";

// import function to update the clinician document with the image URL
import { updateClinicianImageReference } from "@/src/lib/firebase/therapyFirestore";

// Replace the two functions below
// upload an image for a clinician and update the clinician doc
export async function updateClinicianImage(clinicianId, image) {
  // wrap in try/catch to handle errors
  try {
    // verify a clinician ID was provided
    if (!clinicianId) {
      throw new Error("No clinician ID has been provided.");
    }

    // verify an image file with a name was provided
    if (!image || !image.name) {
      throw new Error("A valid image has not been provided.");
    }

    // upload the image and get its public URL
  const publicImageUrl = await uploadImage(clinicianId, image);
  // update the clinician document with the new image URL
  await updateClinicianImageReference(clinicianId, publicImageUrl);

    // return the public URL for use in the UI
    return publicImageUrl;
  } catch (error) {
    // log any errors and let the caller handle the failure
    console.error("Error processing request:", error);
  }
}

// helper to upload the file bytes to Firebase Storage and return its URL
async function uploadImage(clinicianId, image) {
  // build a storage path for the image
  const filePath = `images/${clinicianId}/${image.name}`;
  // create a storage reference for the file
  const newImageRef = ref(storage, filePath);
  // upload the file (resumable upload) to the reference
  await uploadBytesResumable(newImageRef, image);

  // return the public download URL for the uploaded file
  return await getDownloadURL(newImageRef);
}