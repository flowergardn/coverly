import { Music, ArrowRight, Eye, Lightbulb, Target } from "lucide-react";
import { redirect } from "next/navigation";
import LandingCover from "~/components/landing-cover";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";

async function onSubmit(f: FormData) {
  "use server";
  const artist = f.get("artist") as string;
  redirect("/guess/" + artist);
}

export default function CoverlyLanding() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-8">
            <h1 className="mb-4 flex items-center justify-center gap-3 text-6xl font-bold md:text-7xl">
              <Music className="h-16 w-16 text-white md:h-20 md:w-20" />
              Coverly
            </h1>
            <p className="text-xl font-light text-gray-300 md:text-2xl">
              Guess the song from pixelated cover art
            </p>
          </div>

          <LandingCover />

          <div className="mx-auto mb-12 grid max-w-3xl gap-8 md:grid-cols-3">
            <div className="text-center">
              <div className="bg-secondary mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
                <Eye className="h-8 w-8 text-white" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">See the Crop</h3>
              <p className="text-sm text-gray-400">
                Get a tiny, pixelated piece of cover art
              </p>
            </div>
            <div className="text-center">
              <div className="bg-secondary mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
                <Lightbulb className="h-8 w-8 text-white" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">Use Hints</h3>
              <p className="text-sm text-gray-400">
                Reveal more of the cover if you&apos;re stuck
              </p>
            </div>
            <div className="text-center">
              <div className="bg-secondary mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
                <Target className="h-8 w-8 text-white" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">Guess Right</h3>
              <p className="text-sm text-gray-400">
                Name that song in 5 tries or less
              </p>
            </div>
          </div>

          <div className="mt-[10vh]">
            <h2 className="mb-6 text-3xl font-bold md:text-4xl">
              Ready to test your music knowledge?
            </h2>
            <p className="mb-8 text-lg text-gray-300">
              Enter your favorite artist and see how well you know their cover
              arts
            </p>

            <div className="mx-auto max-w-md">
              <form action={onSubmit} className="flex gap-3">
                <Input
                  type="text"
                  placeholder="Enter artist name..."
                  name="artist"
                  className="flex-1"
                />
                <Button
                  type="submit"
                  className="flex items-center gap-2 whitespace-nowrap"
                >
                  Play
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
