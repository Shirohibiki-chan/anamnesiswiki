import { describe, expect, it } from "vitest";
import {
  defaultMediaWidth,
  mediaInfoFor,
  mediaLabel,
  mediaLinkIn,
  oembedUrl,
  parseMediaLink,
  playerShape,
  playerUrl,
  playsFromStill,
  readOembed,
} from "./media-service";

describe("parseMediaLink", () => {
  it("takes every form of a YouTube video link and keeps the id", () => {
    for (const url of [
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "https://youtube.com/watch?v=dQw4w9WgXcQ&t=42s&feature=share",
      "https://m.youtube.com/watch?v=dQw4w9WgXcQ",
      "https://youtu.be/dQw4w9WgXcQ?si=abc",
      "https://www.youtube.com/shorts/dQw4w9WgXcQ",
      "https://www.youtube.com/live/dQw4w9WgXcQ",
      "https://www.youtube.com/embed/dQw4w9WgXcQ",
      "youtube.com/watch?v=dQw4w9WgXcQ",
    ]) {
      expect(parseMediaLink(url), url).toEqual({
        service: "youtube",
        kind: "video",
        id: "dQw4w9WgXcQ",
        url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      });
    }
  });

  it("takes a playlist as a playlist, and a video inside one as the video", () => {
    expect(parseMediaLink("https://www.youtube.com/playlist?list=PLabcdef123456")).toEqual({
      service: "youtube",
      kind: "playlist",
      id: "PLabcdef123456",
      url: "https://www.youtube.com/playlist?list=PLabcdef123456",
    });
    expect(parseMediaLink("https://www.youtube.com/embed/videoseries?list=PLabcdef123456")?.kind).toBe("playlist");
    expect(parseMediaLink("https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLabcdef123456")?.kind).toBe("video");
  });

  it("keeps YouTube Music as its own service with YouTube's id", () => {
    expect(parseMediaLink("https://music.youtube.com/watch?v=dQw4w9WgXcQ&list=RDAMVM")).toEqual({
      service: "youtube-music",
      kind: "video",
      id: "dQw4w9WgXcQ",
      url: "https://music.youtube.com/watch?v=dQw4w9WgXcQ",
    });
    expect(parseMediaLink("https://music.youtube.com/playlist?list=PLabcdef123456")?.service).toBe("youtube-music");
  });

  it("takes Spotify's six kinds, the intl segment, and the URI", () => {
    expect(parseMediaLink("https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC?si=xyz")).toEqual({
      service: "spotify",
      kind: "track",
      id: "4uLU6hMCjMI75M1A2tKUQC",
      url: "https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC",
    });
    expect(parseMediaLink("https://open.spotify.com/intl-de/album/4uLU6hMCjMI75M1A2tKUQC")?.kind).toBe("album");
    for (const kind of ["playlist", "artist", "episode", "show"]) {
      expect(parseMediaLink(`https://open.spotify.com/${kind}/4uLU6hMCjMI75M1A2tKUQC`)?.kind).toBe(kind);
    }
    expect(parseMediaLink("spotify:track:4uLU6hMCjMI75M1A2tKUQC")?.url).toBe("https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC");
    expect(parseMediaLink("https://open.spotify.com/user/somebody")).toBeNull();
  });

  it("takes a SoundCloud track and a set, and not a user's pages", () => {
    expect(parseMediaLink("https://soundcloud.com/forss/flickermood?in=x")).toEqual({
      service: "soundcloud",
      kind: "track",
      id: "forss/flickermood",
      url: "https://soundcloud.com/forss/flickermood",
    });
    expect(parseMediaLink("https://soundcloud.com/forss/sets/soulhack")?.kind).toBe("set");
    expect(parseMediaLink("https://soundcloud.com/forss")).toBeNull();
    expect(parseMediaLink("https://soundcloud.com/forss/tracks")).toBeNull();
    expect(parseMediaLink("https://soundcloud.com/discover/sets/charts")).toBeNull();
    expect(parseMediaLink("https://on.soundcloud.com/abc123")).toBeNull();
  });

  it("leaves everything else alone", () => {
    expect(parseMediaLink("https://example.com/watch?v=dQw4w9WgXcQ")).toBeNull();
    expect(parseMediaLink("https://www.youtube.com/channel/UCabc")).toBeNull();
    expect(parseMediaLink("https://www.youtube.com/")).toBeNull();
    expect(parseMediaLink("not a link")).toBeNull();
    expect(parseMediaLink("")).toBeNull();
  });
});

describe("mediaLinkIn", () => {
  it("takes only a lone address, with the whitespace a paste carries", () => {
    expect(mediaLinkIn("  https://youtu.be/dQw4w9WgXcQ \n")?.id).toBe("dQw4w9WgXcQ");
    expect(mediaLinkIn("watch this https://youtu.be/dQw4w9WgXcQ")).toBeNull();
  });
});

describe("oembedUrl", () => {
  it("asks YouTube about a YouTube Music link, since the id is YouTube's", () => {
    const link = parseMediaLink("https://music.youtube.com/watch?v=dQw4w9WgXcQ")!;
    expect(oembedUrl(link)).toBe("https://www.youtube.com/oembed?url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3DdQw4w9WgXcQ&format=json");
  });

  it("asks the other two on their own endpoints", () => {
    expect(oembedUrl(parseMediaLink("https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC")!)).toBe(
      "https://open.spotify.com/oembed?url=https%3A%2F%2Fopen.spotify.com%2Ftrack%2F4uLU6hMCjMI75M1A2tKUQC",
    );
    expect(oembedUrl(parseMediaLink("https://soundcloud.com/forss/flickermood")!)).toBe(
      "https://soundcloud.com/oembed?url=https%3A%2F%2Fsoundcloud.com%2Fforss%2Fflickermood&format=json",
    );
  });
});

describe("readOembed", () => {
  it("keeps the title, the author and a web thumbnail, and nothing that is not there", () => {
    expect(readOembed({ title: " A Song ", author_name: "Someone", thumbnail_url: "https://i.example/x.jpg", html: "<iframe>" })).toEqual({
      title: "A Song",
      author: "Someone",
      thumbnailUrl: "https://i.example/x.jpg",
    });
    expect(readOembed({ thumbnail_url: "data:image/png;base64,xx" })).toEqual({ title: "", author: "", thumbnailUrl: null });
    expect(readOembed(null)).toEqual({ title: "", author: "", thumbnailUrl: null });
  });
});

describe("playerUrl and playerShape", () => {
  const look = { theme: "dark" as const, accent: "#c084fc" };

  it("plays YouTube through the nocookie player, autoplaying since the still was clicked", () => {
    expect(playerUrl(parseMediaLink("https://youtu.be/dQw4w9WgXcQ")!, look)).toBe("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1&rel=0");
    expect(playerUrl(parseMediaLink("https://www.youtube.com/playlist?list=PLabcdef123456")!, look)).toBe(
      "https://www.youtube-nocookie.com/embed/videoseries?list=PLabcdef123456&autoplay=1&rel=0",
    );
    expect(playerShape(parseMediaLink("https://youtu.be/dQw4w9WgXcQ")!)).toEqual({ ratio: 16 / 9 });
    expect(playsFromStill(parseMediaLink("https://youtu.be/dQw4w9WgXcQ")!)).toBe(true);
  });

  it("gives Spotify its dark look on a dark page, compact for a track and tall for a list", () => {
    const track = parseMediaLink("https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC")!;
    const album = parseMediaLink("https://open.spotify.com/album/4uLU6hMCjMI75M1A2tKUQC")!;
    expect(playerUrl(track, look)).toBe("https://open.spotify.com/embed/track/4uLU6hMCjMI75M1A2tKUQC?theme=0");
    expect(playerUrl(track, { ...look, theme: "light" })).toBe("https://open.spotify.com/embed/track/4uLU6hMCjMI75M1A2tKUQC");
    expect(playerShape(track)).toEqual({ height: 152 });
    expect(playerShape(album)).toEqual({ height: 352 });
    expect(playsFromStill(track)).toBe(false);
  });

  it("hands SoundCloud the accent without its hash, and the list layout for a set", () => {
    const track = parseMediaLink("https://soundcloud.com/forss/flickermood")!;
    const url = new URL(playerUrl(track, look));
    expect(url.origin + url.pathname).toBe("https://w.soundcloud.com/player/");
    expect(url.searchParams.get("url")).toBe("https://soundcloud.com/forss/flickermood");
    expect(url.searchParams.get("color")).toBe("c084fc");
    expect(url.searchParams.get("auto_play")).toBe("false");
    expect(playerShape(track)).toEqual({ height: 166 });
    expect(playerShape(parseMediaLink("https://soundcloud.com/forss/sets/soulhack")!)).toEqual({ height: 300 });
  });
});

describe("defaultMediaWidth", () => {
  it("gives a video the column and a lone track less of it", () => {
    expect(defaultMediaWidth(parseMediaLink("https://youtu.be/dQw4w9WgXcQ")!)).toBe(100);
    expect(defaultMediaWidth(parseMediaLink("https://open.spotify.com/album/4uLU6hMCjMI75M1A2tKUQC")!)).toBe(100);
    expect(defaultMediaWidth(parseMediaLink("https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC")!)).toBe(60);
    expect(defaultMediaWidth(parseMediaLink("https://soundcloud.com/forss/flickermood")!)).toBe(60);
  });
});

describe("mediaInfoFor and mediaLabel", () => {
  it("starts a block unfetched and names it by service and kind", () => {
    const info = mediaInfoFor(parseMediaLink("https://music.youtube.com/watch?v=dQw4w9WgXcQ")!);
    expect(info).toEqual({
      url: "https://music.youtube.com/watch?v=dQw4w9WgXcQ",
      service: "youtube-music",
      kind: "video",
      mediaId: "dQw4w9WgXcQ",
      title: "",
      author: "",
      thumbnail: "",
      fetched: false,
    });
    expect(mediaLabel(info)).toBe("YouTube Music video");
    expect(mediaLabel({ service: "soundcloud", kind: "set" })).toBe("SoundCloud playlist");
    expect(mediaLabel({ service: "spotify", kind: "episode" })).toBe("Spotify episode");
  });
});
