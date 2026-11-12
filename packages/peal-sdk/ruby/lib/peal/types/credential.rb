# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class Credential < Internal::Types::Model
      extend Peal::Internal::Types::Union

      discriminant :type

      member -> { Peal::Types::CredentialUser }, key: "USER"

      member -> { Peal::Types::CredentialAPIKey }, key: "API_KEY"

      member -> { Peal::Types::CredentialPartnerKey }, key: "PARTNER_KEY"
    end
  end
end
