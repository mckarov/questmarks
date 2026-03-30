import { PermissionsAndroid, Platform } from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import { DEFAULT_COUNTRY_CODE, getCountryByCode } from '../constants/countries';

const DEFAULT_COUNTRY = getCountryByCode(DEFAULT_COUNTRY_CODE);
const REVERSE_ENDPOINT = 'https://nominatim.openstreetmap.org/reverse';

const getCurrentPosition = () =>
  new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 10000,
    });
  });

class CountryService {
  getFallbackCountry() {
    return DEFAULT_COUNTRY;
  }

  async requestLocationPermission() {
    if (Platform.OS === 'android') {
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'QuestMarks location access',
          message: 'QuestMarks uses your location to detect your country.',
          buttonPositive: 'OK',
        }
      );

      return result === PermissionsAndroid.RESULTS.GRANTED;
    }

    if (typeof Geolocation.requestAuthorization === 'function') {
      const permission = await Geolocation.requestAuthorization('whenInUse');
      return permission === 'granted';
    }

    return true;
  }

  async reverseCountryFromCoordinates(latitude, longitude) {
    const response = await fetch(
      `${REVERSE_ENDPOINT}?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=3&addressdetails=1&accept-language=en`,
      {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'QuestMarks/1.0',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Country reverse lookup failed with ${response.status}`);
    }

    const payload = await response.json();
    const countryCode = payload?.address?.country_code?.toUpperCase();

    return getCountryByCode(countryCode) || DEFAULT_COUNTRY;
  }

  async detectCurrentCountry() {
    try {
      const granted = await this.requestLocationPermission();

      if (!granted) {
        return DEFAULT_COUNTRY;
      }

      const position = await getCurrentPosition();

      return this.reverseCountryFromCoordinates(
        position.coords.latitude,
        position.coords.longitude
      );
    } catch (error) {
      console.log('Country detection fallback:', error.message);
      return DEFAULT_COUNTRY;
    }
  }
}

export default new CountryService();
