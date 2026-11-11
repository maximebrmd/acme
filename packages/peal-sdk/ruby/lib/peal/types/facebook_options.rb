# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    # How a post goes out on a Facebook Page. Scheduling needs none of them; `format` makes it a `story`, sent without
    # the post's text, or a `reel`; `videoTitle` is for a post of a video or a reel.
    class FacebookOptions < Internal::Types::Model
      field :format, -> { Peal::Types::FacebookFormat }, optional: true, nullable: false

      field :video_title, -> { String }, optional: true, nullable: false, api_name: "videoTitle"
    end
  end
end
