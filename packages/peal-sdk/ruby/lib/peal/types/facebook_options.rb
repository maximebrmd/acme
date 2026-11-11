# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    # How a post goes out on a Facebook Page. Scheduling needs none of them; `videoTitle` is for a post of a video.
    class FacebookOptions < Internal::Types::Model
      field :video_title, -> { String }, optional: true, nullable: false, api_name: "videoTitle"
    end
  end
end
