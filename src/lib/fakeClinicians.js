import {
  randomNumberBetween,
  getRandomDateAfter,
  getRandomDateBefore,
} from "@/src/lib/utils.js";
import { randomData } from "@/src/lib/randomData.js";

import { Timestamp } from "firebase/firestore";

export async function generateFakeCliniciansAndReviews() {
  const cliniciansToAdd = 5;
  const data = [];

  for (let i = 0; i < cliniciansToAdd; i++) {
    const clinicianTimestamp = Timestamp.fromDate(getRandomDateBefore());

    const ratingsData = [];

    // Generate a random number of ratings/reviews for this clinician
    for (let j = 0; j < randomNumberBetween(0, 5); j++) {
      const ratingTimestamp = Timestamp.fromDate(
        getRandomDateAfter(clinicianTimestamp.toDate())
      );

      const ratingData = {
        rating:
          randomData.clinicianReviews[
            randomNumberBetween(0, randomData.clinicianReviews.length - 1)
          ].rating,
        text: randomData.clinicianReviews[
          randomNumberBetween(0, randomData.clinicianReviews.length - 1)
        ].text,
        userId: `User #${randomNumberBetween()}`,
        timestamp: ratingTimestamp,
      };

      ratingsData.push(ratingData);
    }

    const avgRating = ratingsData.length
      ? ratingsData.reduce(
          (accumulator, currentValue) => accumulator + currentValue.rating,
          0
        ) / ratingsData.length
      : 0;

    const clinicianData = {
      specialty:
        randomData.clinicianSpecialties[
          randomNumberBetween(0, randomData.clinicianSpecialties.length - 1)
        ],
      name: randomData.clinicianNames[
        randomNumberBetween(0, randomData.clinicianNames.length - 1)
      ],
      avgRating,
      location: randomData.clinicianCities[
        randomNumberBetween(0, randomData.clinicianCities.length - 1)
      ],
      numRatings: ratingsData.length,
      sumRating: ratingsData.reduce(
        (accumulator, currentValue) => accumulator + currentValue.rating,
        0
      ),
      price: randomNumberBetween(1, 4),
      photo: `https://storage.googleapis.com/firestorequickstarts.appspot.com/food_${randomNumberBetween(
        1,
        22
      )}.png`,
      timestamp: clinicianTimestamp,
    };

    data.push({
      clinicianData,
      ratingsData,
    });
  }
  return data;
}
