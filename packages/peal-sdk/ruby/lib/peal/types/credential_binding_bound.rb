# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class CredentialBindingBound < Internal::Types::Model
      field :id, -> { String }, optional: false, nullable: false

      field :name, -> { String }, optional: false, nullable: false

      field :permissions, -> { Internal::Types::Array[Peal::Types::Permission] }, optional: false, nullable: false

      field :refused, -> { Peal::Types::OverviewRefusal }, optional: false, nullable: true
    end
  end
end
