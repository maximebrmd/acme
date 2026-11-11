# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class ConflictErrorBody < Internal::Types::Model
      extend Peal::Internal::Types::Union

      discriminant :type

      member -> { Peal::Types::QueueNameTakenEncoded }, key: "QUEUE_NAME_TAKEN"

      member -> { Peal::Types::TooManyQueuesEncoded }, key: "TOO_MANY_QUEUES"
    end
  end
end
