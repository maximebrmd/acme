# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class AccountStandingUnread < Internal::Types::Model
      field :reason, -> { Peal::Types::AccountUnreadReason }, optional: false, nullable: false
    end
  end
end
