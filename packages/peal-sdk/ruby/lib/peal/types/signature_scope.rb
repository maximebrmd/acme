# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class SignatureScope < Internal::Types::Model
      extend Peal::Internal::Types::Union

      discriminant :type

      member -> { Peal::Types::SignatureScopeWorkspace }, key: "WORKSPACE"

      member -> { Peal::Types::SignatureScopePlatform }, key: "PLATFORM"

      member -> { Peal::Types::SignatureScopeChannel }, key: "CHANNEL"
    end
  end
end
