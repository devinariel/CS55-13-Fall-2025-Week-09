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
          randomData.restaurantReviews[
            randomNumberBetween(0, randomData.restaurantReviews.length - 1)
          ].rating,
        text: randomData.restaurantReviews[
          randomNumberBetween(0, randomData.restaurantReviews.length - 1)
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
        randomData.restaurantCategories[
          randomNumberBetween(0, randomData.restaurantCategories.length - 1)
        ],
      name: randomData.restaurantNames[
        randomNumberBetween(0, randomData.restaurantNames.length - 1)
      ],
      avgRating,
      location: randomData.restaurantCities[
        randomNumberBetween(0, randomData.restaurantCities.length - 1)
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
