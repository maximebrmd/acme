# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class ContentViolationAspectRatioUnsupported < Internal::Types::Model
      field :channel_id, -> { String }, optional: false, nullable: false, api_name: "channelId"

      field :platform, -> { Peal::Types::Platform }, optional: false, nullable: false

      field :media_id, -> { String }, optional: false, nullable: false, api_name: "mediaId"

      field :height, -> { Integer }, optional: false, nullable: false

      field :width, -> { Integer }, optional: false, nullable: false

      field :maximum, -> { Peal::Types::ContentViolationAspectRatioUnsupportedMaximum }, optional: false, nullable: false

      field :minimum, -> { Peal::Types::ContentViolationAspectRatioUnsupportedMinimum }, optional: false, nullable: false
    end
  end
end
