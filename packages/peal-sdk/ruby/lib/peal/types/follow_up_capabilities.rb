# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class FollowUpCapabilities < Internal::Types::Model
      field :comment_text_limits, -> { Internal::Types::Array[Peal::Types::TextLimit] }, optional: true, nullable: false, api_name: "commentTextLimits"

      field :kind, -> { Peal::Types::FollowUpCapabilitiesKind }, optional: false, nullable: false

      field :max_count, -> { Integer }, optional: false, nullable: false, api_name: "maxCount"
    end
  end
end
