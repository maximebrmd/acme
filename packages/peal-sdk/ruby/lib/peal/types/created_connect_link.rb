# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class CreatedConnectLink < Internal::Types::Model
      field :link, -> { Peal::Types::ConnectLink }, optional: false, nullable: false

      field :url, -> { String }, optional: false, nullable: false
    end
  end
end
