# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class TikTokAccount < Internal::Types::Model
      field :posting, -> { Peal::Types::TikTokAccountPosting }, optional: false, nullable: false

      field :takes_photos, -> { Internal::Types::Boolean }, optional: false, nullable: false, api_name: "takesPhotos"
    end
  end
end
