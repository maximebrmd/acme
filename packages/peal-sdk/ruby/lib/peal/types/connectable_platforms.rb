# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class ConnectablePlatforms < Internal::Types::Model
      field :instagram_connections, -> { Internal::Types::Array[Peal::Types::InstagramConnection] }, optional: false, nullable: false, api_name: "instagramConnections"

      field :platforms, -> { Internal::Types::Array[Peal::Types::Platform] }, optional: false, nullable: false
    end
  end
end
