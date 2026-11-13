# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class NoticeEventPaymentMethodNeeded < Internal::Types::Model
      field :accounts, -> { Integer }, optional: false, nullable: false

      field :allowed, -> { Integer }, optional: false, nullable: false

      field :grace_until, -> { String }, optional: false, nullable: false, api_name: "graceUntil"
    end
  end
end
