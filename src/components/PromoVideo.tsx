import { useState } from 'react';
import VideoAbout from '../assets/about.mp4';

export const PromoVideo = () => {
  const [loading, setIsLoading] = useState(true);
  return (
    <div className="about-promo">
      <div
        className="video_placeholder"
        data-loading={loading.toString()}
      />
      <video
        className="video"
        src={VideoAbout}
        loop
        disablePictureInPicture
        disableRemotePlayback
        controls={false}
        playsInline
        autoPlay
        muted
        data-loading={loading.toString()}
        onLoadedData={() => {
          setIsLoading(false);
        }}
      />
    </div>
  );
};
