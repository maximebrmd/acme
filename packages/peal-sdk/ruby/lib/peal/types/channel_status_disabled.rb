# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class ChannelStatusDisabled < Internal::Types::Model
      field :refresh_needed, -> { Internal::Types::Boolean }, optional: false, nullable: false, api_name: "refreshNeeded"
    end
  end
end
