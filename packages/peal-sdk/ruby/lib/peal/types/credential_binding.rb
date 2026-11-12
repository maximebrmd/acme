# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class CredentialBinding < Internal::Types::Model
      extend Peal::Internal::Types::Union

      discriminant :type

      member -> { Peal::Types::CredentialBindingUnbound }, key: "UNBOUND"

      member -> { Peal::Types::CredentialBindingBound }, key: "BOUND"

      member -> { Peal::Types::CredentialBindingLeft }, key: "LEFT"
    end
  end
end
