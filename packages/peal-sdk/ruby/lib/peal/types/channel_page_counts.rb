# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class ChannelPageCounts < Internal::Types::Model
      field :active, -> { Integer }, optional: false, nullable: false

      field :disabled, -> { Integer }, optional: false, nullable: false

      field :refresh_needed, -> { Integer }, optional: false, nullable: false, api_name: "refreshNeeded"
    end
  end
end
