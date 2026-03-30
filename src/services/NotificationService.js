import { Platform } from 'react-native';
import notifee, {
  AndroidImportance,
  AuthorizationStatus,
} from '@notifee/react-native';

const CHANNEL_ID = 'questmarks-nearby-landmarks';
const FOREGROUND_NOTIFICATION_ID = 'questmarks-proximity-monitor';

class NotificationService {
  constructor() {
    this.channelReady = false;
  }

  async requestPermission() {
    try {
      const settings = await notifee.requestPermission();
      const status = settings?.authorizationStatus;

      return (
        status == null ||
        status === AuthorizationStatus.AUTHORIZED ||
        status === AuthorizationStatus.PROVISIONAL
      );
    } catch (error) {
      console.log('Notification permission request failed:', error.message);
      return false;
    }
  }

  async ensureChannel() {
    if (Platform.OS !== 'android' || this.channelReady) {
      return CHANNEL_ID;
    }

    const createdId = await notifee.createChannel({
      id: CHANNEL_ID,
      name: 'Nearby landmarks',
      importance: AndroidImportance.HIGH,
    });

    this.channelReady = true;
    return createdId;
  }

  async displayLandmarkNotification(landmark) {
    const granted = await this.requestPermission();
    if (!granted) {
      return false;
    }

    const channelId = await this.ensureChannel();

    await notifee.displayNotification({
      title: 'Landmark nearby',
      body: `${landmark.name} is within 100m. You can check in now.`,
      android: {
        channelId,
        pressAction: {
          id: 'default',
        },
      },
      ios: {
        foregroundPresentationOptions: {
          alert: true,
          badge: false,
          sound: true,
          banner: true,
          list: true,
        },
      },
    });

    return true;
  }

  async startForegroundMonitoring() {
    if (Platform.OS !== 'android') {
      return;
    }

    const channelId = await this.ensureChannel();

    await notifee.displayNotification({
      id: FOREGROUND_NOTIFICATION_ID,
      title: 'QuestMarks nearby alerts active',
      body: 'QuestMarks is checking for landmarks around you while your phone is locked.',
      android: {
        channelId,
        asForegroundService: true,
        ongoing: true,
        pressAction: {
          id: 'default',
        },
      },
    });
  }

  async stopForegroundMonitoring() {
    if (Platform.OS !== 'android') {
      return;
    }

    try {
      await notifee.stopForegroundService();
    } catch (error) {
      console.log('Foreground service stop skipped:', error.message);
    }
  }
}

export default new NotificationService();
