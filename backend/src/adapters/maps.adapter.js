const calculateDistanceKm = (latitude1, longitude1, latitude2, longitude2) => {
  const toRadians = (value) => value * Math.PI / 180;

  const latDifference = toRadians(latitude2 - latitude1);
  const lngDifference = toRadians(longitude2 - longitude1);

  const a =
    Math.sin(latDifference / 2) ** 2 +
    Math.cos(toRadians(latitude1)) *
    Math.cos(toRadians(latitude2)) *
    Math.sin(lngDifference / 2) ** 2;

  const distance = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Number(distance.toFixed(2));
};

module.exports = {
  calculateDistanceKm
};
