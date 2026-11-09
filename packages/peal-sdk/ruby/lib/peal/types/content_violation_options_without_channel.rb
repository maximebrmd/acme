# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class ContentViolationOptionsWithoutChannel < Internal::Types::Model
      field :channel_id, -> { String }, optional: false, nullable: false, api_name: "channelId"
    end
  end
end
