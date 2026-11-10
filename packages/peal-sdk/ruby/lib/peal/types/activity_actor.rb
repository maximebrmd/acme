# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class ActivityActor < Internal::Types::Model
      extend Peal::Internal::Types::Union

      discriminant :type

      member -> { Peal::Types::ActivityActorUser }, key: "USER"

      member -> { Peal::Types::ActivityActorAPIKey }, key: "API_KEY"
    end
  end
end
