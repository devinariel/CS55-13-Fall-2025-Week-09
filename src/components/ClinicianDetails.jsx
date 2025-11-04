import React from "react";
import renderStars from "@/src/components/Stars.jsx";

const ClinicianDetails = ({
  clinician,
  userId,
  handleClinicianImage,
  setIsOpen,
  isOpen,
  children,
}) => {
  // Support both profilePicture and photo field names
  const imageUrl = clinician.photo || clinician.profilePicture || '/profile.svg';
  
  return (
    <section className="img__section">
      <img 
        src={imageUrl} 
        alt={clinician.name || 'Clinician'} 
        onError={(e) => {
          // Fallback to default profile icon if image fails to load
          e.target.src = '/profile.svg';
        }}
      />

      <div className="actions">
        {userId && (
          <img
            alt="review"
            className="review"
            onClick={() => {
              setIsOpen(!isOpen);
            }}
            src="/review.svg"
          />
        )}
        <label
          onChange={(event) => handleClinicianImage(event.target)}
          htmlFor="upload-image"
          className="add"
        >
          <input
            name=""
            type="file"
            id="upload-image"
            className="file-input hidden w-full h-full"
          />

          <img className="add-image" src="/add.svg" alt="Add image" />
        </label>
      </div>

      <div className="details__container">
        <div className="details">
          <h2>{clinician.name}</h2>

          <div className="clinician__rating">
            <ul>{renderStars(clinician.avgRating)}</ul>

            <span>({clinician.numRatings})</span>
          </div>

          <p>
            {clinician.specialization} | {clinician.city}
          </p>
          {clinician.modality && <p className="text-sm text-[#657F38]">Modality: {clinician.modality}</p>}
          {children}
        </div>
      </div>
    </section>
  );
};

export default ClinicianDetails;

