export type RenderProps = {
  style: "waveform" | "nowplaying" | "soundorb";
  config: {
    title: string;
    eyebrow: string;
    genre: string;
    badge: string;
    minutes: string;
    asmrLabel: string;
    cardLabel: string;
    timeStart: string;
  };
  audioUrl: string;
  imageUrl: string;
  durationSeconds: number;
};
