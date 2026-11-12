type MediaSource =
  | { kind: 'youtube' | 'tiktok' | 'vimeo' | 'soundcloud'; src: string }
  | { kind: 'video' | 'audio' | 'image'; src: string }
  | { kind: 'link'; src: string };

function getMediaSource(value: string): MediaSource {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return { kind: 'link', src: '' };
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return { kind: 'link', src: '' };

  const host = url.hostname.toLowerCase().replace(/^www\./, '');
  const path = url.pathname;
  if (host === 'youtu.be' || host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
    const videoId = host === 'youtu.be'
      ? path.split('/').filter(Boolean)[0]
      : path.startsWith('/watch')
        ? url.searchParams.get('v')
        : path.match(/^\/(?:embed|shorts|live)\/([^/?]+)/)?.[1];
    return videoId
      ? { kind: 'youtube', src: `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}` }
      : { kind: 'link', src: url.href };
  }
  if (host === 'tiktok.com') {
    const videoId = path.match(/\/video\/(\d+)/)?.[1];
    return videoId
      ? { kind: 'tiktok', src: `https://www.tiktok.com/player/v1/${videoId}?music_info=1&description=1` }
      : { kind: 'link', src: url.href };
  }
  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const videoId = path.match(/\/(?:video\/)?(\d+)/)?.[1];
    return videoId
      ? { kind: 'vimeo', src: `https://player.vimeo.com/video/${videoId}` }
      : { kind: 'link', src: url.href };
  }
  if (host === 'soundcloud.com' || host === 'on.soundcloud.com') {
    return {
      kind: 'soundcloud',
      src: `https://w.soundcloud.com/player/?url=${encodeURIComponent(url.href)}&color=%23c99b3d&auto_play=false`,
    };
  }

  const extension = url.pathname.split('.').pop()?.toLowerCase();
  if (extension && ['mp4', 'webm', 'ogv', 'mov'].includes(extension)) return { kind: 'video', src: url.href };
  if (extension && ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'].includes(extension)) return { kind: 'audio', src: url.href };
  if (extension && ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif'].includes(extension)) return { kind: 'image', src: url.href };
  return { kind: 'link', src: url.href };
}

export default function MediaEmbed({ url, title }: { url: string; title: string }) {
  const media = getMediaSource(url);
  if (!media.src) return <p className="helper-text">La URL multimedia no es válida.</p>;

  if (media.kind === 'video') {
    return <video className="repertoire-media" controls preload="metadata" src={media.src}>{title}</video>;
  }
  if (media.kind === 'audio') {
    return <audio className="repertoire-audio" controls preload="metadata" src={media.src}>{title}</audio>;
  }
  if (media.kind === 'image') {
    return <img className="repertoire-media" src={media.src} alt={title} loading="lazy" />;
  }
  if (media.kind === 'link') {
    return <a className="button secondary" href={media.src} target="_blank" rel="noreferrer">Abrir {title}</a>;
  }

  return (
    <iframe
      className={`repertoire-embed repertoire-embed-${media.kind}`}
      src={media.src}
      title={title}
      loading="lazy"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      allowFullScreen
      referrerPolicy="strict-origin-when-cross-origin"
    />
  );
}
