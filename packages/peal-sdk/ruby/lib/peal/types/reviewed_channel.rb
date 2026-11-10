# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class ReviewedChannel < Internal::Types::Model
      field :channel_id, -> { String }, optional: false, nullable: false, api_name: "channelId"

      field :handle, -> { String }, optional: false, nullable: true

      field :options, -> { Peal::Types::TargetOptions }, optional: false, nullable: true

      field :platform, -> { Peal::Types::Platform }, optional: false, nullable: true

      field :text, -> { String }, optional: false, nullable: false
    end
  end
end
