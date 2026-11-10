# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class AdSignInResult < Internal::Types::Model
      field :accounts, -> { Internal::Types::Array[Peal::Types::ReachableAdAccount] }, optional: false, nullable: false

      field :connection, -> { Peal::Types::AdConnection }, optional: false, nullable: false
    end
  end
end
