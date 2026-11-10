# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class PlatformCapabilitiesAnalytics < Internal::Types::Model
      field :per_post, -> { Internal::Types::Boolean }, optional: false, nullable: false, api_name: "perPost"
    end
  end
end
