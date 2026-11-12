# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class OverviewChannels < Internal::Types::Model
      field :connected, -> { Integer }, optional: false, nullable: false

      field :off, -> { Integer }, optional: false, nullable: false

      field :to_reconnect, -> { Integer }, optional: false, nullable: false, api_name: "toReconnect"
    end
  end
end
