# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class AccountStanding < Internal::Types::Model
      extend Peal::Internal::Types::Union

      discriminant :type

      member -> { Peal::Types::AccountStandingUnrestricted }, key: "UNRESTRICTED"

      member -> { Peal::Types::AccountStandingRead }, key: "READ"

      member -> { Peal::Types::AccountStandingUnread }, key: "UNREAD"
    end
  end
end
