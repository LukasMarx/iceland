const spotImageById: Record<string, string> = {
  geysir: 'linear-gradient(145deg, rgba(238, 242, 240, 0.12), rgba(31, 41, 55, 0.26)), radial-gradient(circle at 52% 36%, #f8fafc 0 9%, transparent 10%), linear-gradient(135deg, #9bb7ac 0%, #e9dfc9 48%, #5b756a 100%)',
  gullfoss: 'linear-gradient(145deg, rgba(255, 255, 255, 0.08), rgba(16, 17, 20, 0.26)), linear-gradient(160deg, #d9e7eb 0 34%, #f8fafc 35% 45%, #7f947a 46% 68%, #3f5f4d 69% 100%)',
  seljalandsfoss: 'linear-gradient(145deg, rgba(255, 255, 255, 0.06), rgba(16, 17, 20, 0.3)), linear-gradient(90deg, transparent 0 44%, rgba(255, 255, 255, 0.88) 45% 52%, transparent 53% 100%), linear-gradient(135deg, #586f66 0%, #a6b3a1 52%, #3f524c 100%)',
  bruarfoss: 'linear-gradient(145deg, rgba(255, 255, 255, 0.1), rgba(16, 17, 20, 0.2)), radial-gradient(circle at 65% 62%, #d7f3f4 0 18%, transparent 19%), linear-gradient(135deg, #345c63 0%, #72aeb7 44%, #e2d6bd 100%)',
  thingvellir: 'linear-gradient(145deg, rgba(255, 255, 255, 0.06), rgba(16, 17, 20, 0.2)), linear-gradient(145deg, #596f58 0 42%, #b6a986 43% 58%, #293d37 59% 100%)',
  kerid: 'linear-gradient(145deg, rgba(255, 255, 255, 0.08), rgba(16, 17, 20, 0.2)), radial-gradient(circle at 50% 56%, #4f8ea3 0 26%, #924e3f 27% 39%, transparent 40%), linear-gradient(135deg, #b36b4b 0%, #5f7d69 100%)',
  kerlingarfjoll: 'linear-gradient(145deg, rgba(255, 255, 255, 0.06), rgba(16, 17, 20, 0.24)), linear-gradient(135deg, #c08b55 0 32%, #e9d3a0 33% 54%, #6d7565 55% 100%)',
  thorsmork: 'linear-gradient(145deg, rgba(255, 255, 255, 0.08), rgba(16, 17, 20, 0.28)), linear-gradient(135deg, #2e5046 0 36%, #8aa370 37% 62%, #d8d3c5 63% 100%)',
};

const fallbackSpotImage = 'linear-gradient(145deg, rgba(255, 255, 255, 0.1), rgba(16, 17, 20, 0.2)), linear-gradient(135deg, #8da39a 0%, #ded4c4 52%, #52655f 100%)';

export function spotImageBackground(spotId: string): string {
  return spotImageById[spotId] ?? fallbackSpotImage;
}
