import React from "react";
import renderStars from "@/src/components/Stars.jsx";

const ClinicianDetails = ({
  clinician,
  userId,
  setIsOpen,
  isOpen,
  children,
}) => {
  // Support both profilePicture and photo field names
  const imageUrl = clinician.photo || clinician.profilePicture || '/profile.svg';
  
  return (
    <section className="img__section mb-8">
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
      </div>

      <div className="details__container">
        <div className="details">
          <h2 className="text-2xl md:text-3xl mb-4 font-bold" style={{ marginBottom: '15px' }}>{clinician.name}</h2>

          <div className="clinician__rating mb-4" style={{ marginBottom: '15px' }}>
            <ul>{renderStars(clinician.avgRating)}</ul>

            <span className="ml-2">({clinician.numRatings || 0} reviews)</span>
          </div>

          <p className="text-base md:text-lg mb-4 font-medium" style={{ marginBottom: '15px', lineHeight: 'calc(1em + 15px)' }}>
            {clinician.specialization} | {clinician.city}
          </p>
          {clinician.modality && (
            <p className="text-sm md:text-base mb-4" style={{ color: '#F1EAD8', marginBottom: '15px', lineHeight: 'calc(1em + 15px)' }}>
              Modality: {clinician.modality}
            </p>
          )}
          <div className="mt-6" style={{ marginTop: '15px' }}>
            {children}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ClinicianDetails;

