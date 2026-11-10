# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class ForbiddenErrorBody < Internal::Types::Model
      extend Peal::Internal::Types::Union

      discriminant :type

      member -> { Peal::Types::ForbiddenEncoded }, key: "FORBIDDEN"

      member -> { Peal::Types::PartnerAccountsClosedEncoded }, key: "PARTNER_ACCOUNTS_CLOSED"
    end
  end
end
