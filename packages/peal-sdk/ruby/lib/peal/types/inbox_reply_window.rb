# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class InboxReplyWindow < Internal::Types::Model
      field :closes_at, -> { String }, optional: false, nullable: true, api_name: "closesAt"

      field :open, -> { Internal::Types::Boolean }, optional: false, nullable: false
    end
  end
end
