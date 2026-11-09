# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class ContentViolationTooManyMentions < Internal::Types::Model
      field :channel_id, -> { String }, optional: false, nullable: false, api_name: "channelId"

      field :platform, -> { Peal::Types::Platform }, optional: false, nullable: false

      field :count, -> { Integer }, optional: false, nullable: false

      field :maximum, -> { Integer }, optional: false, nullable: false
    end
  end
end
