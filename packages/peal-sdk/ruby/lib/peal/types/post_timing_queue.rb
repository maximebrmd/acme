# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class PostTimingQueue < Internal::Types::Model
      field :queue_id, -> { String }, optional: true, nullable: false, api_name: "queueId"
    end
  end
end
